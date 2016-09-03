Notes on PID

1. PID is suitable when we know nothing about the plant we're controlling, but we can measure its output.

2. Asking more (in any given iteration) than an inner control loop / control action can deliver will wind up the integral term unhelpfully. (Such that it will overshoot unecessacerily)

Better to either not have an integral, or to only increment when control action is within its saturation limits (ie small), which should coincide with region of minimal error.

3. For an outer loop TO NOT ask for a set point of the inner loop that cannot be achieved, then IT MUST know something about the dynamics of the system. eg inertia, thrust available etc.