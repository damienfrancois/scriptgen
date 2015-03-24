Interactive HPC job scheduler submission script wizard
======================================================

Scriptgen is an interactive wizard that allows users of a supercomputer writing submission scripts for the resource manager (e.g. Slurm) easily.

Demo and usage
--------------

Point your browser to https://rawgit.com/damienfrancois/scriptgen/master/scriptgen.html to give it a try.

You will see a three-pane screen like this:

![screenshot](https://github.com/damienfrancois/scriptgen/blob/master/img/screenshot.png)

In the first pane, you enter the features your job needs, in terms of resources. First choose a parallelization paradigm, and the form updates accordingly. For instance, if you choose 'OpenMP', the form will read 'Number of threads' while if you choose 'MPI', you will see 'Number of processes'. Then enter the requested time, memory, and CPU resources.

In the second pane, you will see a list of clusters that fit the requirements. You can then choose one. In the demo, Cluster1 has a very large number of thin nodes, while Cluster2 only has a few fat nodes so depending on the number of CPUs per node, or the memory per process, or the number of CPUs, either one can be disabled. 

In the third pane, you get a submission script that you can copy/paste.

For a real-life example, head to <http://www.ceci-hpc.be/scriptgen.html>

Installation and Setup
----------------------

To test it, you can simply download the zip file and unzip. It does not require a webserver to run as it is all client-side. 

To use it for real, you will need to modify the javascript source file to hardcode the features each of your clusters can offer (Follow the example and the comments in there.) 

Disclaimer
----------

This is a small project I started just to learn a bit of javascript and knockout.js so the code does probably not comply to best practices. It needs major refactoring and reviewing, but it can be used as is. It was designed with Slurm as a resource manager in mind, (and adapted later for other resource managers) so the vocabulary is very Slurm-related.
