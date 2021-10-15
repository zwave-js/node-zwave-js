# Connectivity issues

**Commands sometimes don't go through**  
**Nodes that go dead and come back alive**  
**Reports go missing**

Z-Wave sticks in particular are prone to interference by USB ports, especially by USB3 ports. We recommend putting the stick in a suitable location:

-   on an **USB extension cord** (this works wonders!)
-   away from other USB ports
-   away from metallic surfaces
-   and especially not in the back of a server rack

If you've excluded all this, it's time to look at the mesh. Z-Wave JS doesn't have good tools to measure its quality yet, but often a **network heal** can fix bad routes.
