/* eslint-env browser */

// Streams the output of an SSE source into an unsorted list
class SSEViewer extends HTMLUListElement {
  connectedCallback () {
    const source = new EventSource(this.target)
    source.addEventListener('message', this.onMessage.bind(this), false)
  }

  onMessage (ev) {
    const li = document.createElement('li')
    li.innerHTML = ev.data
    this.appendChild(li)
  }

  get target () {
    return this.getAttribute('target')
  }
}

customElements.define('sse-viewer', SSEViewer, { extends: 'ul' })

// A form that submits in the background
// TODO: Reset the form fields after submitting
class AJAXForm extends HTMLFormElement {
  connectedCallback () {
    this.addEventListener('submit', this.onSubmit.bind(this))
  }

  // TODO: Error Handling
  onSubmit (ev) {
    ev.preventDefault()

    fetch(this.action, {
      method: this.method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: serializeForm(this)
    })

    this.reset()
  }

  get method () {
    const method = this.getAttribute('method')
    return method ? method.toUpperCase() : 'GET'
  }

  get action () {
    return this.getAttribute('action') || ''
  }
}

customElements.define('ajax-form', AJAXForm, { extends: 'form' })

// Not sure why we need to serialize ourselves...
function serializeForm (form) {
  const data = new FormData(form)
  const memo = []
  for (const entry of data.entries()) {
    const key = encodeURIComponent(entry[0])
    const value = encodeURIComponent(entry[1])
    memo.push(`${key}=${value}`)
  }
  return memo.join('&')
}
