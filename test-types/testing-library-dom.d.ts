import '@testing-library/dom'
import '@testing-library/dom/types/queries'

declare module '@testing-library/dom' {
  interface ByRoleOptions {
    exact?: boolean
  }
}

declare module '@testing-library/dom/types/queries' {
  interface ByRoleOptions {
    exact?: boolean
  }
}
