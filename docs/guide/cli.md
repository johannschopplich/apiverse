---
outline: deep
---

# Command Line Interface

APIful includes a command line interface (CLI) for generating TypeScript definitions from OpenAPI schemas. View all available commands with the help flag:

```sh
npx apiful --help
```

This displays the following output:

<<< @/snippets/help.ansi

## Commands

The CLI currently provides one primary command:

### `generate`

Generates TypeScript definitions from OpenAPI schemas. This is the core command for enabling type-safe API clients.

This command requires the `openapi-typescript` package. See the [OpenAPI extension prerequisites](/extensions/openapi#prerequisites) for installation instructions.

> [!IMPORTANT]
> You must have a valid `apiful.config.ts` file with service definitions before running this command.

> [!TIP]
> Read the [OpenAPI](/extensions/openapi) extension documentation to learn how to build the type-safe API client.

By default, this command loads the APIful configuration from the `apiful.config.{js,ts,mjs,cjs,json}` file in the current working directory. APIful uses the c12 configuration system, which supports multiple file formats with automatic TypeScript compilation and environment variable substitution. This means you can use conditional logic, import external modules, and reference environment variables directly in your configuration files, ensuring consistency with modern tooling like Vite and Nuxt.

The generated TypeScript types are saved as `apiful.d.ts` in the same directory. This file augments the `apiful/schema` module with your generated types, making them available to the [OpenAPI](/extensions/openapi) extension.

A schema that cannot be read or parsed fails the whole run: the command reports the service it choked on, exits with code `1`, and writes no types, rather than leaving you with a client that compiles and is silently untyped. Add `--verbose` for the underlying cause. Calling the generator from your own code instead of the CLI, the same failure arrives as a `SchemaGenerationError`.

A service with no `schema` has nothing to generate from, so the run skips it and names it in a warning. Every other service is still generated, and the run succeeds.

> [!NOTE]
> Commit the generated `apiful.d.ts` file to version control so all team members have access to the same types. For optimal developer experience, consider integrating the generate command into your package.json scripts and running it in pre-commit hooks or CI pipelines to ensure types stay synchronized with schema changes.

<<< @/snippets/generate.ansi

View all options for the `generate` command:

```sh
npx apiful generate --help
```

This displays the following output:

<<< @/snippets/generate-help.ansi

> [!NOTE]
> Although it's recommended to create an `apiful.config.ts` file with a [`defineApifulConfig`](/reference/define-apiful-config) default export, you can also write plain JavaScript (`.js`, `.mjs`, `.cjs`) or JSON (`.json`, `.json5`) configuration files.

#### Fragmented Output

For projects with many services, the generated type declaration file can grow large. Use `--outdir` to split the output into a directory structure with separate files per service:

```sh
npx apiful generate --outdir generated
```

The generated output follows this structure:

- `generated/apiful.d.ts` – Main entry file with shared type helpers
- `generated/schema/*.d.ts` – Individual service declaration files

Splitting types into separate files keeps git diffs smaller and improves IDE performance for large schemas.

Each run rewrites the entry file and the fragment of every configured service, and deletes the fragments of services the configuration no longer lists. Files it did not write are left alone, so the directory may hold your own sources as well.

To return to single-file mode, run the command with `--outfile` (or use the default behavior) and delete the directory yourself – nothing outside a run's own output is ever removed.
