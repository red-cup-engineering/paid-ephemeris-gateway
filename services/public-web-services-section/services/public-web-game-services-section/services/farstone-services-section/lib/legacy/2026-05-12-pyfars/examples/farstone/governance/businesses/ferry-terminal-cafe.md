---
type: business
kind: cafe
title: "Ferry Terminal Cafe"
place: harbor-district
address: "1 Ferry Landing"
opening-hours:
  monday:    [["05:30", "10:00"], ["14:30", "19:00"]]
  tuesday:   [["05:30", "10:00"], ["14:30", "19:00"]]
  wednesday: [["05:30", "10:00"], ["14:30", "19:00"]]
  thursday:  [["05:30", "10:00"], ["14:30", "19:00"]]
  friday:    [["05:30", "10:00"], ["14:30", "21:00"]]
  saturday:  [["06:00", "10:00"], ["14:30", "21:00"]]
  sunday:    [["06:00", "10:00"], ["14:30", "19:00"]]
closes-on-holidays: false
status: active
---


Inside the ferry terminal building.
Hours track the ferry sailings: open before the morning ferry, closed during midday when the boat is on the mainland, reopens for the afternoon return.
Two open-intervals per day per the structured hours model; the opening-hours derivation rule handles multi-interval days without changes.

The cafe is a useful stress-test for the open-now derivation: a day with two intervals exercises the next-open-at and next-close-at projections in ways a single-interval business does not.
