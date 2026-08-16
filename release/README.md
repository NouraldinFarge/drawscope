# Distribution support files

This directory contains files copied into generated Windows distributions:

- `README.txt` and `launch-portable.bat` support the portable ZIP;
- `README-installer.txt` explains the current-user NSIS installation and data ownership;
- `installer-resources/` supplies the installed-layout marker and empty saved-page inbox.

No executable, installer, certificate, password, or private key is committed here.
Generated ZIPs, installers, checksums, metadata, SBOMs, and attestations live outside the
workspace or on the corresponding GitHub release. See the
[distribution guide](../docs/DISTRIBUTION.md).
