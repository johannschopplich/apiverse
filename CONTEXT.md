# Context

## Glossary

**Generation plan** — everything a `generate` run would change on disk, decided before it touches any of it: the contents of every file it would write, the generated fragments it would delete, the directories it would create, and the line it reports afterwards. `--check` compares a plan against what is already there instead of applying it.
