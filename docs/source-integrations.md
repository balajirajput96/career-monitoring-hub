# Source Integration Notes

## LinkedIn

The product will not scrape LinkedIn, bypass its access controls, or automate submissions without an explicitly supported integration. LinkedIn's public product catalog describes consumer sign-in/content sharing and employer-side Talent products, while the Job Posting API is limited to approved partners and is intended for posting jobs on behalf of employers—not for job-seeker-side search or application automation.[1][2][3]

LinkedIn webhooks exist only for applications with an approved webhook use case. They require developer-app configuration, a validated HTTPS endpoint, and signed-event verification; the availability of a generic job-seeker job-search or application-status webhook is not established by the documentation reviewed.[4]

Accordingly, the initial discovery pipeline will use legitimate, configurable public web-search sources and official company careers pages. LinkedIn URLs may be stored when surfaced by those sources, but the application tracker will require an explicit per-job owner approval before any external action.

## References

[1]: https://developer.linkedin.com/product-catalog "LinkedIn API Products"
[2]: https://developer.linkedin.com/product-catalog/talent "LinkedIn Talent API Products"
[3]: https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview?view=li-lts-2026-03 "LinkedIn Job Posting API"
[4]: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation "LinkedIn Webhooks"
