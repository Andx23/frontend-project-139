
import leoProfanity from 'leo-profanity'

// Filtrar palabras ofensivas utilizando el diccionario de la biblioteca.
const filterProfanity = (text) => leoProfanity.clean(text)

export default filterProfanity
