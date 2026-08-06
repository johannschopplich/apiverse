# Client extensions are copied, not shared

`with` gives every extended client its own extension record and points its proxy at the
original client, rather than writing into one record shared by the whole chain and wrapping
the previous proxy. Sharing reads like a caching optimization and is the opposite: because
each proxy wrapped the one before it, every trap re-entered the next proxy down, so a
property read cost `125 ns` at one extension, `2.2 µs` at four, and `41 µs` at eight. Copying
the record lets each proxy target the original client, which keeps a read at `23 ns` however
long the chain is, and makes `with` return a client instead of also rewriting the one it was
called on.

## Consequences

Two clients extended from the same client no longer overwrite each other's methods, a
handler extension's own properties survive a later `with`, and a discarded `with` result
leaves its receiver alone. Copying the record costs one pass over the extension names per
`with` call, paid once when the client is built.
