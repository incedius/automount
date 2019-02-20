# automount

tera-proxy module to automatically mount some set time after you start moving.

**Quirk**

Jumping as you move will reset the "timer/counter". Move like Leeroy to prevent automount without toggling it off.

# Usage

Use command `automount` or `am` to toggle ON/OFF. Default OFF

`am set` to configure mount to use. Enter command, use mount skill.

`am delay <delay value>` to configure delay. Default `10`. Delay isn't based on time but depends on the number of location change packets sent from the client.