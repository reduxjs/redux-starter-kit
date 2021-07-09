import React, { useState, useEffect } from 'react'

function BraveWarning() {
  const [isBrave, setIsBrave] = useState(false)

  useEffect(() => {
    const check = async () => {
      return (navigator.brave && (await navigator.brave.isBrave())) || false
    }

    check()
      .then((isBrave) => {
        if (isBrave) {
          setIsBrave(isBrave)
        }
      })
      .catch(console.error)
  }, [])

  return isBrave && !localStorage.getItem('brave-warning-dismissed') ? (
    <div className="admonition admonition-caution alert alert--warning">
      <div className="admonition-heading">
        <h5>
          <span className="admonition-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
            >
              <path
                fill-rule="evenodd"
                d="M8.893 1.5c-.183-.31-.52-.5-.887-.5s-.703.19-.886.5L.138 13.499a.98.98 0 0 0 0 1.001c.193.31.53.501.886.501h13.964c.367 0 .704-.19.877-.5a1.03 1.03 0 0 0 .01-1.002L8.893 1.5zm.133 11.497H6.987v-2.003h2.039v2.003zm0-3.004H6.987V5.987h2.039v4.006z"
              ></path>
            </svg>
          </span>
          Brave Browser Warning
        </h5>
      </div>
      <div className="admonition-content">
        <p>
          It appears that you're using Brave - that's awesome. We recommend
          disabling shields for this domain as well as CodeSandbox in the event
          that the examples do not load correctly.
        </p>
        <button
          className="button button--warning button--md"
          onClick={() => {
            localStorage.setItem('brave-warning-dismissed', true)
            setIsBrave(false)
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  ) : null
}

export default BraveWarning
