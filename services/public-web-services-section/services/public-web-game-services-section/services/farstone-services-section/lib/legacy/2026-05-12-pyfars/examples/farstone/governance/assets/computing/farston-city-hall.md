---
kind: computer-system
title: "farston-city-hall"
description: "City Hall's primary server. Runs Farston's PyFARS engine."
status: active
primary-user: "aliyah-reyes"
role: "server"
host-class: "ubuntu-server"
os-family: "ubuntu"
deployment-class: "portable-nix-user-systemd"
service-manager: "systemd-user"
runtime-root: "/home/farston/polity"
home-dir: "/home/farston"
---


The municipality's central server, sitting in the basement of City Hall.
Hosts the PyFARS engine that runs Farston's polity — every workitem, dispatch, witness, and assignment goes through this box.
Mayor Reyes is the primary user but the city-clerk-bot office (`records-clerk-bot`) is the day-to-day operator.

This is a fictional host for the Arc 0 testbed; no real machine corresponds to it.
Substrate paths, deployment class, and service-manager match what a real small-municipality VPS would carry.
