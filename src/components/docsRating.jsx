import React from 'react'
import useIsBrowser from '@docusaurus/useIsBrowser'
import { useState } from 'react'


export const DocsRating = ({ label }) => {

  const isBrowser = useIsBrowser()
  const [voted, setVoted] = useState(false)
  if (!isBrowser) {
    return null
  }

  const submitGoogleAnalyticsFeedback = (val) => {
    if (voted) {
      return
    }
    console.log('submitGoogleAnalyticsFeedback', label, val)

    if (window.gtag) {
      window.gtag('event', 'doc-feedback', {
        event_category: 'engagement',
        event_label: label,
        value: val,
      })
    }
    setVoted(true)
  }

  return (
    <div id='feedback'>
      <button disabled={voted} onClick={() => submitGoogleAnalyticsFeedback(1)}>👍</button>
      <button disabled={voted} onClick={() => submitGoogleAnalyticsFeedback(0)}>👎</button>
      {voted && (<div>Your vote has been submited</div>)}
    </div>

  )
}

