# HELP Hive Liquidity Enterprise

This xiaowei converts released, already-settled surplus into exact LP proposals.
For every candidate pool it must account for both legs, current ratio, fees,
slippage, impermanent-loss exposure, withdrawal constraints, and the value of
keeping the assets liquid, including an exact merchant and LP-recall reserve.
It may consume no more than the expiring surplus release issued after Sigmund's
arbitrage reserve is admitted.

Its output is a plan digest and requested asset quantities. AGRODAO admits or
refuses the request; Aagaard alone may execute the resulting envelope. Missing,
expired, or mismatched releases fail closed.
