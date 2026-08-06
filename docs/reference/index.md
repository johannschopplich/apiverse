# Reference

The exported symbols, their type definitions, and the options each one takes. For how the pieces fit together, start with the [guide](/guide/getting-started).

## Methods

| Method | What it does |
|---|---|
| [`createClient`](/reference/create-client) | Creates a client from default fetch options. Every APIful client starts here. |
| [`createOpenAPIClient`](/reference/create-openapi-client) | Creates a client typed from a generated OpenAPI schema, without the extension chain. |
| [`defineApifulConfig`](/reference/define-apiful-config) | Declares the services the [`generate`](/guide/cli) command reads. |

## Types

| Type | What it describes |
|---|---|
| [`ApiClient`](/reference/api-client) | The client itself: its default options and the `with` method that extends it. |
| [`HandlerExtensionBuilder`](/reference/handler-extension-builder) | An extension that gives the client its call signature. |
| [`MethodsExtensionBuilder`](/reference/methods-extension-builder) | An extension that adds named methods to the client. |

## Extensions

[OpenAPI Type Helpers](/reference/openapi-type-helpers) reach into a generated schema for the request and response types of a single operation – useful when you need to name one in a signature of your own.
