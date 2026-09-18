import * as ReactTestingLibrary from '../node_modules/@testing-library/react/types/index'

export * from '../node_modules/@testing-library/react/types/index'

export const createEvent: typeof ReactTestingLibrary.createEvent & {
  keyDown: (
    element: Document | Element | Window | Node,
    options?: Record<string, unknown>,
  ) => KeyboardEvent
}
