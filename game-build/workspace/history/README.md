# History

The patch chain that built the bundle until 15 October 2026. `patches/patch-v4.py` to `patches/patch-v12.py` each turned one version of the bundle into the next. `bundles/` keeps the versions they read and wrote. Nothing here runs any more.

Since version 12 the bundle is built from `src/` by `build.py`. The output matched the v12 bundle byte for byte when the sources were made. `baselines/bundles/` keeps the four old bundles that tests still read.
