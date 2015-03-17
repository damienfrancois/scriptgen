
"use strict"

var getURLParameter = function(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}

// Constant strings
var byte_units = ["MB", "GB"];
var placement_strategy = ['all grouped on the same node', 'no constraint', 'scattered across distinct nodes', 'evenly distributed across nodes'];
var filesystem = ['$HOME', '$GLOBALSCRATCH', '$LOCALSCRATCH'];

// Cluster model
var partition = function (name, nb_nodes, cpus_per_node, max_cpu_user, mem_per_node, features, max_wall_time, min_wall_time, min_memory, min_cpu, max_memory_per_core, max_tasksarray, project_required) {
    var self = this;
    self.name = name;
    self.nb_nodes = nb_nodes;
    self.cpus_per_node = cpus_per_node;
    self.max_cpu_user = max_cpu_user;
    self.mem_per_node = mem_per_node;
    self.features = features;
    self.max_wall_time = max_wall_time;
    self.min_wall_time = min_wall_time;
    self.min_memory = min_memory;
    self.min_cpu = min_cpu;
    self.max_memory_per_core = max_memory_per_core;
    self.max_tasksarray = max_tasksarray;
    self.project_required = project_required;

}

var cluster = function(manager, name, partitions) {
    var self=this;
    self.manager = manager;
    self.name = name;
    self.partitions = partitions;
}

// TODO: get this information in JSON from some URL so that
// clusters = ['http://localhost/scriptgen/cluster1.json', 'http://localhost/scriptgen/cluster2.json']
var clusters = [
    new cluster("Slurm", // ResourceManager/Scheduler
                "Cluster1", // Name
                [ 
                new partition("defq", // Partition name,
                              120, // Number of nodes
                              16, // Cores per node
                              544, // Max CPU per user
                              64*1024, // RAM per node
                              ['Intel', 'SandyBridge', 'Infiniband', 'globalfs'], // Features
                              2*24, // Max walltime (hours)
                              0, // Min walltime (hours)
                              0, // Min memory (MB)
                              0, // Min CPUs 
                              Infinity, // Max memory per core
                              100, // Max jobarray
                              0), // Project required
                ]),
    new cluster("Slurm", "Cluster2", [
        new partition("defq", 143, 64, 1024, 256*1024,
                      ['AMD', 'Bulldozer', 'Infiniband', 'globalfs',], 
                      14*24, 0, 0, 0, Infinity, 0, 0),
        ]),
    ];

// Job Viewmodel
function myJobViewModel() {
    var self = this;

    // Job attributes
    self.job_name = ko.observable(getURLParameter('job_name') || "");
    self.email_address = ko.observable(getURLParameter('email_address') ||  "");
    self.job_array = ko.observable(getURLParameter('job_array') ||  false);
    self.njobs = ko.observable(getURLParameter('njobs') ||  10);
    self.job_smp =  ko.observable(getURLParameter('job_smp') ||  false);
    self.job_mpi =  ko.observable(getURLParameter('job_mpi') ||  false);
    self.ntasks = ko.observable(getURLParameter('ntasks') ||  10);
    self.cpus_per_task = ko.observable(getURLParameter('cpus_per_task') ||  10);
    self.mem_per_cpu_value = ko.observable(getURLParameter('mem_per_cpu_value') ||  512);
    self.nnodes = ko.observable(getURLParameter('nnodes') ||  1);
    self.mem_per_cpu_unit = ko.observable(getURLParameter('mem_per_cpu_unit') ||  "MB");
    self.job_duration_days = ko.observable(getURLParameter('job_duration_days') ||  "0");
    self.job_duration_hours = ko.observable(getURLParameter('job_duration_hours') ||  "1");
    self.job_duration_minutes = ko.observable(getURLParameter('job_duration_minutes') ||  "0");
    self.process_placement = ko.observable(getURLParameter('process_placement') ||  "no constraint");
    self.job_filesystem = ko.observable(getURLParameter('job_filesystem') ||  "$HOME")
    self.project = ko.observable(getURLParameter('project') ||  "")

    // Job derived attributes
    self.tasks_per_node = ko.computed(function() {
            return Math.ceil(self.ntasks()/self.nnodes());
    });
    self.padded_job_duration_hours = ko.computed(function() { //TODO: better way to do this?
            if (self.job_duration_hours().length == 1)
            return "0" + self.job_duration_hours()
            return self.job_duration_hours();
    });
    self.padded_job_duration_minutes = ko.computed(function() {  //TODO: better way to do this?
            if (self.job_duration_minutes().length == 1)
            return "0" + self.job_duration_minutes()
            return self.job_duration_minutes();
    });
    self.job_duration = ko.computed(function() {
            return parseInt(self.job_duration_days()) * 24 + 
            parseInt(self.job_duration_hours()) + 
            parseInt(self.job_duration_minutes()) / 60;
    });
    self.mem_per_cpu = ko.computed(function() {
            if (self.mem_per_cpu_unit() == "GB" ) {
            return self.mem_per_cpu_value()*1024;
            } else {
            return self.mem_per_cpu_value();
            }
    });
    self.total_cpus = ko.computed(function() {
            if (self.process_placement() == 'scattered across distinct nodes') self.nnodes(self.ntasks())
            if (self.process_placement() == 'all grouped on the same node') self.nnodes(1)
            return self.cpus_per_task() * self.ntasks();
    });
    self.total_cpuhours = ko.computed(function() {
            return self.job_duration() * self.total_cpus();
    });
    self.total_mem = ko.computed(function() {
            return self.mem_per_cpu() * self.cpus_per_task() * self.ntasks();
    });
    self.job_hybrid = ko.computed(function() {
            if (!self.job_smp()) self.cpus_per_task(1); 
            if (!self.job_mpi()) self.ntasks(1); 
            return self.job_smp() && self.job_mpi();
    });
    self.job_purempi = ko.computed(function() {
            return !self.job_smp() && self.job_mpi();
    });
    self.ncpus = ko.computed(function() {
            return self.ntasks() * self.cpus_per_task();
    });

    // Cluster list
    self.cluster_list = ko.observableArray(clusters);

    // Current cluster
    self.selected_cluster_name = ko.observable(getURLParameter('cluster') || "Cluster1"); // TODO: get first cluster from list rather than hardcode it
    self.selected_cluster = ko.computed(function() {
        var res =  ko.utils.arrayFirst(self.cluster_list(), function (cluster) {
            return cluster.name == self.selected_cluster_name() ;
            });
        return res;
    });

    // Suitable clusters
    // TODO: Refactor this entirely so that we can inform the user with the reason why a cluster is not
    // compatible with the resource request.
    var filter_partitions = function(res_type, cluster) {
        var partition_list = []
            for (var i = 0; i < cluster.partitions.length; i++) {
                var partition = cluster.partitions[i]
                    if ( 
                            self.cpus_per_task() <= partition.cpus_per_node &&  // nb threads < nb cpus on node
                            self.total_cpus() <= partition.max_cpu_user &&      // nb cpus < partition limit
                            self.total_cpus() >= partition.min_cpu &&      // nb cpus < partition limit
                            self.job_duration() <= partition.max_wall_time &&   // job duration < partition limit max
                            self.job_duration() > partition.min_wall_time &&   // job duration > partition limit min
                            self.mem_per_cpu()  <= partition.mem_per_node &&    // mem per thread < mem on node
                            self.mem_per_cpu()  <= partition.max_memory_per_core &&    // mem per thread < mem limit per core
                            self.total_mem()  >= partition.min_memory &&    // total memory > minimum memory limit (e.g. Hmem)
                            self.total_mem()  <= partition.mem_per_node*partition.nb_nodes &&    // total memory < total memory on cluster
                            self.mem_per_cpu()*self.cpus_per_task() <= partition.mem_per_node && // mem per process < mem on node
                            self.nnodes()  <= partition.nb_nodes &&             // needed nb nodes < nb nodes on partition
                            ( self.process_placement()=='no constraint' || self.tasks_per_node()*self.cpus_per_task() <= partition.cpus_per_node) && // if placement is not free, cpu per node < cpu per node on partition
                            ( !self.job_mpi() || self.process_placement()=='all grouped on the same node' || partition.features.indexOf('Infiniband')!=-1) && // If MPI then infiniband
                            ( !self.job_array() || self.njobs() <= partition.max_tasksarray ) && // max jobs in a task array if job arrays
                            ( !partition.project_required || self.project().length > 0 ) && // max jobs in a task array if job arrays
                            ( !(self.job_filesystem()=='$GLOBALSCRATCH') || partition.features.indexOf('globalfs')!=-1) && // has global fs if needed by job
                            true
                       ) { 
                        partition_list += partition.name + ","
                    }
            }
        if (partition_list.length > 0) partition_list = partition_list.slice(0, -1);
        if (res_type == "positive") return  partition_list.length > 0
            if (res_type == "negative") return  partition_list.length == 0
                return partition_list;
    }

    //TODO: refactor. Surely too many if/else
    self.suitable_cluster_list = ko.computed(function () {;
        var res = ko.utils.arrayFilter(self.cluster_list(), filter_partitions.bind(self,"positive"));
        if (getURLParameter('selected_cluster_name')) {
            self.selected_cluster_name(getURLParameter('selected_cluster_name') )
        }
        else if (res.length>0) {
            if (res.indexOf(self.selected_cluster())==-1)
                self.selected_cluster_name(res[0].name)
        }
        else {
            self.selected_cluster_name(self.selected_cluster().name)
        }
        return res
    });
    self.unsuitable_cluster_list = ko.computed(function () {
            return ko.utils.arrayFilter(self.cluster_list(), filter_partitions.bind(self,"negative"));
    });
    //TODO: refactor to take into account resource managers that do not allow to submit to several queues (e.g. PBS)
    self.partition_list = ko.computed(function () {
            return filter_partitions("list", self.selected_cluster());
            });
};

