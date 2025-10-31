declare module 'webgazer' {
  interface WebgazerConfig {
    setRegression(type: string): this
    setTracker(type: string): this
    begin(): Promise<void>
    showVideoPreview(show: boolean): this
    showPredictionPoints(show: boolean): this
    setGazeListener(callback: (data: { x: number; y: number } | null, timestamp: number) => void): void
    pause(): void
    resume(): void
    end(): void
  }

  const webgazer: WebgazerConfig
  export default webgazer
}


