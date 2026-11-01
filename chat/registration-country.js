'use strict';
(()=>{
 const panel=document.getElementById('account-panel'),form=document.getElementById('account-form'),signup=document.getElementById('account-signup');
 if(!panel||!form||!signup)return;
 // ISO 3166-1 alpha-2 codes. Labels are localized by the browser.
 const codes=`AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(' ');
 const display=new Intl.DisplayNames([navigator.language||'en'],{type:'region'});
 const wrap=document.createElement('label');wrap.className='yap-signup-country';wrap.htmlFor='registration-country';
 wrap.textContent='Country (optional, for signup statistics)';
 const choice=document.createElement('select');choice.id='registration-country';choice.name='registration-country';
 const unknown=document.createElement('option');unknown.value='';unknown.textContent='Prefer not to say';choice.append(unknown);
 const options=codes.map(code=>({code,name:display.of(code)||code})).sort((a,b)=>a.name.localeCompare(b.name));
 for(const item of options){const opt=document.createElement('option');opt.value=item.code;opt.textContent=item.name;choice.append(opt);}
 const detail=document.createElement('small');detail.textContent='Self-reported country only; no IP or precise location saved for this report.';
 wrap.append(choice,detail);
 form.after(wrap);
 const signed=()=>!!window.YapSession?.get?.()?.access_token;
 const update=()=>wrap.hidden=signed();
 window.addEventListener('yap-account-changed',update);
 const observer=new MutationObserver(update);observer.observe(signup,{attributes:true,attributeFilter:['hidden']});
 window.YapRegistrationCountry={currentCode:()=>codes.includes(choice.value)?choice.value:null};
 update();
})();
