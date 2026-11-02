
import '@testing-library/jest-dom/vitest'

// Simular window.matchMedia para Mantine.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Simular scrollIntoView para los componentes React.
Object.defineProperty(
  HTMLElement.prototype,
  'scrollIntoView',
  {
    writable: true,
    value: () => {},
  },
)
