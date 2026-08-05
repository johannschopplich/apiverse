import type { HandlerExtensionBuilder, MethodsExtensionBuilder } from '../src/index'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createClient } from '../src/index'

describe('createClient', () => {
  const extension = ((_client) => {
    const target = () => new Response()
    target.foo = 'bar'
    return target
  }) satisfies HandlerExtensionBuilder

  const extensionWithRequestMethod = ((_client) => {
    return {
      request: () => new Response(),
    }
  }) satisfies MethodsExtensionBuilder

  const extensionWithResponseMethod = ((_client) => {
    return {
      response: () => ({ foo: 'bar' }),
    }
  }) satisfies MethodsExtensionBuilder

  it('throws when called without a handler extension', () => {
    const client = createClient()
    expect(() => (client as unknown as () => void)()).toThrow(TypeError)
  })

  it('stores default options in client instance', () => {
    const options = {
      baseURL: 'http://example.com',
    }
    const client = createClient(options)
    expect(client.defaultOptions).toEqual(options)
  })

  it('extends client functionality with extension methods', () => {
    const client = createClient()
    const mockedExtension = vi.fn(extension)
    const extendedClient = client.with(mockedExtension)
    expect(mockedExtension).toHaveBeenCalledWith(client)
    expect(extendedClient()).toBeInstanceOf(Response)
  })

  it('adds extension properties to extended client', () => {
    const client = createClient()
    const extendedClient = client.with(extension)
    expect(extendedClient()).toBeInstanceOf(Response)
    expect(extendedClient.foo).toBe('bar')
  })

  it('preserves default options after extension', () => {
    const options = {
      baseURL: 'http://example.com',
    }
    const client = createClient(options)
    const extendedClient = client.with(extension)
    expect(extendedClient.defaultOptions).toEqual(options)
  })

  it('supports multiple extensions combined via chained with()', () => {
    const client = createClient()
    const mockedExtension = vi.fn(extension)
    const extendedClient = client
      .with(mockedExtension)
      .with(extensionWithRequestMethod)
      .with(extensionWithResponseMethod)
    expect(mockedExtension).toHaveBeenCalledWith(client)
    expect(extendedClient()).toBeInstanceOf(Response)
    expect(extendedClient.request()).toBeInstanceOf(Response)
    expect(extendedClient.response()).toEqual({ foo: 'bar' })
  })

  it('resolves method name conflicts by prioritizing later extensions', () => {
    const client = createClient()
    const extendedClient = client
      .with(() => ({ method: () => 'first' }))
      .with(() => ({ method: () => 'second' }))
    expect(extendedClient.method()).toBe('second')
  })

  it('preserves TypeScript type safety with extensions', () => {
    const client = createClient()
    const extendedClient = client.with(() => ({
      typedMethod: (arg: number) => arg.toString(),
    }))
    expectTypeOf(extendedClient.typedMethod).toEqualTypeOf<(arg: number) => string>()
  })

  it('reflects reassigned extension methods on subsequent calls', () => {
    const client = createClient()
    const extendedClient = client.with(() => ({
      compute: (): string => 'original',
    }))
    expect(extendedClient.compute()).toBe('original')

    extendedClient.compute = () => 'replaced'
    expect(extendedClient.compute()).toBe('replaced')
  })

  it('accepts ad-hoc properties on a callable client', () => {
    const handler = ((_client) => {
      const target = () => new Response()
      target.foo = 'initial'
      return target
    }) satisfies HandlerExtensionBuilder

    const extendedClient = createClient().with(handler)
    expect(extendedClient.foo).toBe('initial')
    ;(extendedClient as unknown as { bar: string }).bar = 'added'
    expect((extendedClient as unknown as { bar: string }).bar).toBe('added')
  })

  it('replaces previous callable behavior with the latest callable extension', () => {
    const firstHandler = ((_client) => {
      const target = () => 'first'
      return target as unknown as ReturnType<HandlerExtensionBuilder>
    }) satisfies HandlerExtensionBuilder

    const secondHandler = ((_client) => {
      const target = () => 'second'
      return target as unknown as ReturnType<HandlerExtensionBuilder>
    }) satisfies HandlerExtensionBuilder

    const extendedClient = createClient()
      .with(firstHandler)
      .with(secondHandler)

    expect((extendedClient as unknown as () => string)()).toBe('second')
  })
})
