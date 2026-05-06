const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

;(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  const filePath = path.join(__dirname, '../public/study-plan.html')
  await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 500))

  const outPath = path.join(__dirname, '../public/CoRead_Study_Plan.pdf')
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
  })

  await browser.close()
  console.log(`✅ PDF saved: ${outPath}`)
  console.log(`   Size: ${(fs.statSync(outPath).size / 1024).toFixed(0)} KB`)
})()
