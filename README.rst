============
Particle-Sim
============

Particle-Sim is a particle simulator for experimenting with concepts that may eventually be integrated into a game.

Quick start
-----------
The quickest way to get started is to download the GitHub project onto your machine, unzip, and go to the top-level "particlesim" directory. You can then launch "demo.html" using your favorite browser (tested on Chrome, Firefox, and Edge). The page it brings up will let you load any of the demo worlds and start playing.

Once you've confirmed the simulator is working, the code within "demo.html" can serve as a simple example of how the simulator code is actually used.

Django Install
--------------
This code was structured as a Python package so that it could be easily installed into the Django Python-based web framework. Follow these steps to download, build, install, and integrate. Instructions are for Linux systems.

Download
________
1. Download directly from GitHub at https://github.com/nickwulf/particle-sim and unzip where you want, or
2. If you have git installed on Linux, run the command "git clone https://github.com/nickwulf/particle-sim.git <file_location>" to clone the project to you local area.

Build
_____
Build the Python package by navigating to the top-level project directory, and run the command "python setup.py sdist"

Install
_______
Find the new Python package in the new "dist" directory, and install it into your Python environment by running the command "python -m pip install ./dist/<dist_file>.tar.gz".

Integrate
_________
Integrate the package into Django the same way as with any other package. In the "settings.py" file, include 'particlesim' in the 'INSTALLED_APPS' list. Now you can pull the JS and CSS files into any template via standard template commands, such as "{% static 'particlesim/base.js' %}"
