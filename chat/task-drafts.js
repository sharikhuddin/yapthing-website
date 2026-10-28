'use strict';
/* Task-first offline drafting. No claim of live legal research or jurisdictional compliance. */
window.YapTaskDrafts=(()=>{
 const leaseIntent=s=>/\b(lease|rental|tenancy|rent agreement|rental agreement|landlord.?tenant)\b/i.test(s)&&/\b(draft|create|write|make|prepare|generate|contract|agreement|document|lease)\b/i.test(s);
 const place=s=>{const m=s.match(/\b(?:in|for|located in)\s+([A-Za-z][A-Za-z .'-]{2,45})(?:[,.!?]|$)/i);return m?m[1].trim():''};
 function leaseDraft(s){
 const jurisdiction=place(s)||'[City, state/province and country]';
 return `RESIDENTIAL LEASE AGREEMENT
WORKING DRAFT — Complete all brackets and check local law before signing.

This Residential Lease Agreement ("Agreement") is made on [Date] between:

LANDLORD: [Full legal name], contact: [Phone/email], address: [Mailing address]
TENANT(S): [Full legal names], contact: [Phone/email]

1. PREMISES
The Landlord rents to the Tenant the residential property at [Full property address], ${jurisdiction}. Included areas, parking and furnishings: [Describe]. The property may be occupied by [Names/maximum lawful occupants].

2. TERM
The tenancy begins on [Start date] and ends on [End date], unless renewed or ended in accordance with applicable law. Type: [Fixed-term / month-to-month].

3. RENT AND PAYMENT
Rent is [Currency and amount] per [Month/week], due on the [Day] of each period. Pay via [Approved payment method] to [Payment details]. Any late charge applies only if expressly agreed and permitted by local law: [Terms or none].

4. SECURITY DEPOSIT
Deposit: [Currency and amount]. The Landlord will hold, account for and return it in the manner and time required by applicable law, less lawful documented deductions. Any move-in condition report is attached as Schedule A.

5. UTILITIES AND OTHER CHARGES
Landlord pays: [Utilities/services]. Tenant pays: [Utilities/services]. Other agreed charges: [Specify or none].

6. USE, OCCUPANTS AND SUBLETTING
The premises are for lawful residential use. Additional occupants, pets, smoking and subletting are governed by [Agreed terms], subject to local law and required accommodations.

7. CONDITION, MAINTENANCE AND REPAIRS
The Landlord will provide and maintain the property as required by law. The Tenant will keep it reasonably clean, promptly report defects, and be responsible only for damage legally attributable to the Tenant or guests, beyond ordinary wear and tear. Repair responsibilities: [Details].

8. ACCESS AND PRIVACY
Landlord entry requires the notice and conditions required by applicable law, except lawful emergencies. Agreed contact method for notices: [Method].

9. ALTERATIONS AND KEYS
Alterations require [Written approval terms], subject to law. Keys/access devices issued: [List]. Lock changes and replacement costs follow applicable law.

10. RENEWAL, TERMINATION AND MOVE-OUT
Renewal, notice periods, early termination, eviction and move-out procedures must follow applicable local law. Agreed additional lawful terms: [Details]. Neither party waives non-waivable statutory rights.

11. DAMAGE, INSURANCE AND DISPUTES
Each party remains responsible for obligations imposed by law. Tenant insurance: [Required if lawful / optional / not required]. Disputes should first be raised in writing and then resolved through the lawful process in the property jurisdiction.

12. ADDITIONAL TERMS
[Add any negotiated provisions, ensuring they do not conflict with mandatory tenant protections.]

13. GOVERNING LAW
The law of the jurisdiction where the property is located governs this Agreement. Local mandatory rental rules take precedence over conflicting clauses.

14. SIGNATURES
Landlord: __________________________  Date: __________
Tenant: ____________________________  Date: __________
Additional tenant: ___________________  Date: __________

Schedule A: Move-in condition checklist and photographs [Attach].
Schedule B: Inventory, parking, rules and required legal disclosures [Attach as applicable].

NEXT: Tell me the property location (city/state/country), monthly rent, deposit, lease start/end dates and landlord/tenant names. I'll help fill this in and tailor it. This is a general draft, not a verified jurisdiction-specific legal form.`;
 }
 function taskInstruction(s){if(!leaseIntent(s))return '';return 'The user wants a finished, practical lease document, not a generic introduction. Draft a comprehensive residential lease agreement immediately with clearly marked placeholders for missing names, property address, jurisdiction, rent, deposit and dates. Include parties, premises, term, rent, deposit, utilities, repairs, access, termination, notices, governing law, signatures and required-disclosure placeholders. Do not invent local legal requirements or claim research was performed. Finish by asking only for the most important missing details and offer to revise. If search tools actually return sources, use and cite them; otherwise say that local legal rules are not verified.'}
 return {leaseIntent,leaseDraft,taskInstruction};
})();
