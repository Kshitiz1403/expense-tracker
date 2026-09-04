This application is a an extensive expense tracker that allows users to keep track of their expenses and income.
It brings in transactions data from different sources like SMS, Emails, Bank Statements, etc.
The idea is to have a single source of truth for all the transactions and keep track of the income and expenses.

It will feature automatic transaction tagging, categorization, and analysis.
Any transaction which can not be confidently categorized by the AI will have to be manually categorized later and the AI can learn from that.

We have setup an sms-gateway which is this open source project: https://github.com/capcom6/android-sms-gateway
This is to pull SMS messages from the phone and parse them to extract the transaction details.

We will have another plugin which will pull emails.
Altogether all this information will go into our common backend i.e. data from SMS and emails.
The backend will first filter out the messages which are related to transactions.
Once identified that they are transaction messages, they will be passed to the AI for tagging, categorization, and analysis.

Our backend will be built in GoLang and frontend in NextJS.

We need to work on frontend and backend together.
For frontend, we should use lucide icons for the UI and radix ui for the components.
The philosophy I follow is "Don't reinvent the wheel is not a suggestion, its a law".
