# SZN Team Calendar

Public team view of the SZN Content Calendar: the last 3 days, today and the next 5 days, plus the "How it's doing" report.
Live at https://1940farms.github.io/1940-farms-email-footer/szn-calendar/

Rebuilt every morning (7:30 AM Toronto) by a Claude scheduled task:
1. Read index.html, data.js, report.js and logo_white.png from the private SZN Content Calendar artifact.
2. `node szn-calendar/build.js <those files> szn-calendar`
3. Commit and push to main.

Do not edit index.html, data.js or report.js here by hand; they are overwritten each morning. Change build.js instead.
