export async function continueReport(page){
 const button=page.getByRole('button',{name:'CONTINUE →',exact:true});
 if((await button.getAttribute('class'))?.split(/\s+/).includes('hold-button')){await button.focus();await page.keyboard.down('Enter');await page.waitForTimeout(2200);await page.keyboard.up('Enter');}
 else await button.click();
}
