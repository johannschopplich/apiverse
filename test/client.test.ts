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

  it('stores the default options on the client', () => {
    const options = {
      baseURL: 'http://example.com',
    }
    const client = createClient(options)
    expect(client.defaultOptions).toEqual(options)
  })

  it('throws when called without a handler extension', () => {
    const client = createClient()
    expect(() => (client as unknown as () => void)()).toThrow(TypeError)

    const withMethodsOnly = client.with(extensionWithRequestMethod)
    expect(() => (withMethodsOnly as unknown as () => void)()).toThrow(/handler extension/)
  })

  it('passes the client to the extension builder', () => {
    const client = createClient()
    const mockedExtension = vi.fn(extension)
    const extendedClient = client.with(mockedExtension)
    expect(mockedExtension).toHaveBeenCalledWith(client)
    expect(extendedClient()).toBeInstanceOf(Response)
  })

  it('exposes the properties of a handler extension on the client', () => {
    const client = createClient()
    const extendedClient = client.with(extension)
    expect(extendedClient()).toBeInstanceOf(Response)
    expect(extendedClient.foo).toBe('bar')
  })

  it('preserves the default options after `with`', () => {
    const options = {
      baseURL: 'http://example.com',
    }
    const client = createClient(options)
    const extendedClient = client.with(extension)
    expect(extendedClient.defaultOptions).toEqual(options)
  })

  it('exposes the methods of every extension in a `with` chain', () => {
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

  it('keeps the declared signature of an extension method', () => {
    const client = createClient()
    const extendedClient = client.with(() => ({
      typedMethod: (arg: number) => arg.toString(),
    }))
    expectTypeOf(extendedClient.typedMethod).toEqualTypeOf<(arg: number) => string>()
  })

  it('passes the handler call signature to the next extension builder', () => {
    const extendedClient = createClient()
      .with(() => (path: string): Response => new Response(path))
      .with(client => ({ home: () => client('/') }))

    expectTypeOf(extendedClient.home).toEqualTypeOf<() => Response>()
  })

  it('passes an earlier extension\'s methods to the next extension builder', () => {
    const extendedClient = createClient()
      .with(() => ({ token: (): string => 'abc' }))
      .with(client => ({ authorization: () => `Bearer ${client.token()}` }))

    expectTypeOf(extendedClient.authorization).toEqualTypeOf<() => string>()
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

  it('keeps the methods of two clients extended from the same client apart', () => {
    const client = createClient()
    const left = client.with(() => ({ tag: () => 'left' }))
    const right = client.with(() => ({ tag: () => 'right' }))
    expect(left.tag()).toBe('left')
    expect(right.tag()).toBe('right')
  })

  it('keeps the callable behavior of a client another was extended from', () => {
    const client = createClient()
    const first = client.with(() => () => 'first')
    const second = first.with(() => () => 'second')
    expect((first as unknown as () => string)()).toBe('first')
    expect((second as unknown as () => string)()).toBe('second')
  })

  it('leaves the client `with` was called on without the extension', () => {
    const client = createClient()
    client.with(() => ({ ghost: () => 'boo' }))
    expect(Object.keys(client._extensions)).toEqual([])
    expect((client as unknown as { ghost?: unknown }).ghost).toBeUndefined()
  })

  it('exposes the properties of a handler extension after a further `with`', () => {
    const extendedClient = createClient()
      .with(extension)
      .with(extensionWithRequestMethod)
    expect(extendedClient.foo).toBe('bar')
    expect(extendedClient.request()).toBeInstanceOf(Response)
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
