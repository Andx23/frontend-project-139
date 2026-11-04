
import StoreContext from './StoreContext.js'

function StoreProvider({
  authStore,
  chatStore,
  children,
}) {
  return (
    <StoreContext.Provider value={{ authStore, chatStore }}>
      {children}
    </StoreContext.Provider>
  )
}

export default StoreProvider
