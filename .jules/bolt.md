# Bolt's Journal - Critical Learnings Only

## 2025-05-15 - [N+1 Query Pattern in Super Curator Dashboard]
**Learning:** The `getSuperCuratorDashboard` server action had a severe N+1 bottleneck where it performed 4 database queries (counts and finds) for each curator in a loop. In a Prisma environment, this can be efficiently solved using `groupBy` and bulk `findMany` combined with in-memory aggregation.
**Action:** Always scan for database calls inside `.map()` or `for` loops in server actions, especially in dashboards aggregating data from multiple entities. Use `groupBy` for counts/sums across many parents.
