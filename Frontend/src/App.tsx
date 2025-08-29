import { useEffect } from '@lynx-js/react'
import FeedScreen from './screens/FeedScreen.js'

export function App(props: {
  onRender?: () => void
}) {
  useEffect(() => {
    console.info('TikTok-style Feed App')
  }, [])
  props.onRender?.()

  return <FeedScreen />
}
