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
class AJAXForm extends HTMLFormElement {
  connectedCallback () {
    this.addEventListener('submit', this.onSubmit.bind(this))
  }

  // TODO: Error Handling
  onSubmit (ev) {
    ev.preventDefault()

    const formData = new FormData(this)
    const body = new URLSearchParams(formData)

    fetch(this.action, {
      method: this.method,
      body
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
