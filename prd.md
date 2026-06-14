# FindMyPet — Product Requirements Document

---

## 1. Overview

**Product name:** FindMyPet
**Type:** Web application (desktop and mobile)
**Language support:** Multiple languages
**Summary:** FindMyPet helps pet owners report missing pets, lets neighbors search and claim rewards for finding them, and connects desperate owners with licensed professional pet hunters as a last resort.

---

## 2. Audience

**Primary user:** A pet owner who has lost their pet and needs to find it fast.
**Secondary user:** A neighbor or passerby who has spotted a stray and wants to help (and possibly earn a reward).
**Tertiary user:** A licensed professional pet hunter who uses the platform to receive paid cases.

---

## 3. Problem

When a pet goes missing, owners have no single place to:
- Announce that their pet is missing to people nearby
- Motivate those people to actively go look
- Verify that a found pet is actually theirs before meeting a stranger
- Escalate to professional help when community searching fails

---

## 4. Solution

A three-layer escalation system:

| Layer | Who acts | Cost | Trigger |
|---|---|---|---|
| 1 — Post a listing | Owner posts, community browses | Free | Pet goes missing |
| 2 — Neighbor search | Neighbor finds pet, claims reward | Owner-set cash reward, paid in person | Someone spots the pet |
| 3 — Professional search | Licensed hunters search the area | $50 upfront, refunded if unsuccessful | No community find within owner's patience |

---

## 5. Pages & Screens

### 5.1 Home Screen
**URL:** `/`
**Purpose:** Entry point. Introduces the site and routes users to every major feature.

**Elements:**
- Site name: **FindMyPet** displayed prominently at the top
- Short one-line tagline explaining what the site does
- Four navigation buttons:
  - **Browse** → goes to `/browse`
  - **Report** → goes to `/report`
  - **Texting Portal** → goes to `/messages`
  - **Call Professional** → goes to `/call-pro`
- Footer with privacy policy link

---

### 5.2 Browse Page
**URL:** `/browse`
**Purpose:** Lets anyone view all active lost pet cases.

**Elements:**
- Filter bar at the top:
  - Filter by pet type: Dog / Cat / Bird / Other (separate tabs or dropdown)
- Grid or list of **listing cards**, each showing:
  - Pet photo
  - Pet name, breed, and color
  - Last seen location (neighborhood only — no full address)
  - Date posted
  - Reward amount (if set by owner)
  - Case status badge: **Open** or **Solved**
- Clicking a card opens the **Listing Detail Page** (`/listing/:id`)

---

### 5.3 Listing Detail Page
**URL:** `/listing/:id`
**Purpose:** Full details of a single lost pet case.

**Elements:**
- Large pet photo
- Pet details: name, breed, color, age (if provided)
- Last seen: neighborhood and date
- Owner's description (free text written by the owner)
- Reward amount
- Case status: **Open** or **Solved**
- Button: **"I found this pet"** → opens the claim flow (see User Flow 3)
- Button: **"Message Owner"** → redirects to Texting Portal with owner pre-filled
- If case is Solved: a banner reads "This pet has been reunited with its owner."

---

### 5.4 Report Page
**URL:** `/report`
**Purpose:** Lets a logged-in owner submit a new lost pet case.

**Requires:** User must be logged in. If not, redirect to Sign Up / Login page first.

**Form fields:**
| Field | Type | Required |
|---|---|---|
| Pet name | Text input | Yes |
| Pet type | Dropdown (Dog, Cat, Bird, Other) | Yes |
| Breed | Text input | Yes |
| Color | Text input | Yes |
| Age | Number input | No |
| Photo | Image upload | Yes |
| Last seen location (neighborhood) | Text input | Yes |
| Date last seen | Date picker | Yes |
| Description | Text area (free text) | Yes |
| Reward amount ($) | Number input | No |

**On submit:**
- Case is created and appears on Browse page immediately
- Owner is redirected to their new Listing Detail Page
- A confirmation message is shown: "Your case has been posted. We hope FindMyPet helps bring your pet home."

---

### 5.5 Texting Portal
**URL:** `/messages`
**Purpose:** In-app messaging between pet owners and finders using phone numbers.

**Elements:**
- Search box at the top: enter a pet owner's phone number to start a conversation
- Conversation list on the left (if logged in and has existing threads)
- Chat window on the right showing the message thread
- Finders can attach a photo in the chat (used to submit proof of find)
- Phone numbers are used to identify users but are not shown publicly anywhere on the site

**Rules:**
- Only logged-in users can send messages
- A finder must attach a photo of the found pet when claiming a find — this triggers AI verification (see Feature 6.6)

---

### 5.6 Call Professional Page
**URL:** `/call-pro`
**Purpose:** Connects the owner with the professional pet finder service.

**Elements:**
- A large, clearly displayed phone number for the professional finder service
- Explanation of the service:
  - 3 licensed hunters assigned per case
  - Each hunter searches a different section of the neighborhood
  - $50 flat fee paid upfront by phone or online before search begins
  - Full refund guaranteed if the pet is not found within 7 days, or if the team formally declares the search unsuccessful
- List of what qualifies a finder: must hold a valid specialized hunting license
- FAQ section answering: What happens after I call? How do I get a refund? How do hunters know where to look?

---

### 5.7 Sign Up / Login Page
**URL:** `/auth`
**Purpose:** Account creation and login.

**Sign Up fields:**
| Field | Type | Required |
|---|---|---|
| Full name | Text input | Yes |
| Email address | Text input | Yes |
| Phone number | Text input | Yes |
| Password | Password input | Yes |
| Confirm password | Password input | Yes |

**Login fields:**
- Email address
- Password
- "Forgot password?" link → sends a reset email

**Rules:**
- Account required to: post a listing, send messages, claim a reward
- No account required to: browse listings, view listing details, view the Call Professional page

---

### 5.8 Account / Profile Page
**URL:** `/profile`
**Purpose:** Lets a logged-in user manage their cases and account.

**Elements:**
- User's name and contact info (editable)
- List of their posted cases with status (Open / Solved)
- Button to mark any Open case as Solved
- Option to archive or keep a Solved case public

---

## 6. Features

### 6.1 Account System
- Users register with name, email, phone number, and password
- Required to post listings, send messages, or claim rewards
- Not required to browse

### 6.2 Lost Pet Listings
- Fields: photo, pet name, type, breed, color, age, last seen location (neighborhood), date, description, reward amount
- Listings are public and visible to all visitors
- Full address is never shown publicly

### 6.3 Pet Type Sections
- Browse page is filterable by: Dog, Cat, Bird, Other
- Each type has its own tab or section so users only see relevant listings

### 6.4 Reward System
- Owner types in a dollar amount when posting
- Reward is displayed on the listing card and detail page
- Payment happens in person at the handoff meetup — the site does not process money for Layer 2

### 6.5 In-App Texting Portal
- Messaging between owner and finder using registered phone numbers
- Supports text messages and photo attachments
- Location (full address for meetup) is shared here privately, never on the public listing

### 6.6 AI Photo Verification
- When a finder claims they found a pet, they must submit a photo through the text portal
- The AI compares the submitted photo against the original listing photo
- Checks: animal species, breed, color, and distinguishing markings
- If the AI cannot confidently verify a match (e.g. blurry photo, low light), it flags the claim for manual owner review rather than auto-rejecting
- The owner makes the final decision to accept or reject the claim

### 6.7 Case Status System
- Every case is either **Open** or **Solved**
- Only the owner can mark a case as Solved
- Once Solved, the owner chooses: keep the case visible (as a success story) or archive it (hidden from Browse)

### 6.8 Professional Finder Service (Layer 3)
- Accessed via the Call Professional page
- 3 licensed hunters assigned per case
- Hunters must submit a valid specialized hunting license to be listed
- $50 upfront payment, refunded within 7 days if the pet is not found
- Hunters coordinate search area coverage (one section of the neighborhood each)

### 6.9 Multi-Language Support
- Site automatically detects the user's browser language and displays content accordingly

### 6.10 Responsive Design
- All pages work on both desktop and mobile screen sizes

---

## 7. User Flows

### Flow 1 — Owner Posts a Lost Pet
1. Owner visits FindMyPet homepage
2. Clicks **Report**
3. If not logged in → redirected to Sign Up / Login → creates account → returned to Report page
4. Fills in the form: photo, pet details, last seen location, description, reward amount
5. Clicks Submit
6. Case appears on Browse page
7. Owner is taken to their new Listing Detail Page

### Flow 2 — Neighbor Finds the Pet
1. Neighbor visits FindMyPet homepage
2. Clicks **Browse**
3. Filters by pet type if needed
4. Spots the matching listing, clicks it
5. Reads the Listing Detail Page
6. Clicks **"I found this pet"**
7. Redirected to Texting Portal with owner pre-filled
8. Sends a message and attaches a photo of the found pet
9. AI verifies the photo matches the listing
10. If verified → owner is notified; if uncertain → owner reviews manually
11. Owner accepts the claim
12. Owner shares meetup location privately in the text portal
13. Finder brings the pet to the meetup location
14. Owner pays the reward in cash
15. Owner marks the case as Solved on their profile

### Flow 3 — Owner Hires a Professional
1. Owner visits FindMyPet homepage
2. Clicks **Call Professional**
3. Reads the service details and FAQ
4. Dials the displayed phone number
5. Pays $50 upfront by phone or online
6. 3 licensed hunters are assigned to the case
7. Hunters search their assigned sections of the neighborhood
8. If found within 7 days → hunters contact owner to arrange return
9. If not found within 7 days → full $50 refund issued

---

## 8. Privacy Rules

- Full addresses are never shown publicly — only neighborhood names on listings
- Full address is shared only through the private text portal between owner and verified finder
- Phone numbers are used internally to identify users but are not displayed publicly
- Personal information is only accessible to users directly involved in a case

---

## 9. Out of Scope

The following will NOT be built in this version:
- Online payment processing for Layer 2 rewards (handled in cash at meetup)
- A map showing where pets were last seen
- Push notifications or SMS alerts
- A rating or review system for finders or hunters
- An admin dashboard for managing hunters or disputes

---

## 10. Success Criteria

The project is complete and working when:
- [ ] A user can create an account and log in
- [ ] A logged-in user can post a lost pet listing with a photo and description
- [ ] Any visitor can browse listings and filter by pet type
- [ ] A finder can message an owner through the texting portal
- [ ] A finder can submit a photo claim and the AI comparison runs
- [ ] An owner can mark a case as Solved and choose to archive or keep it
- [ ] The Call Professional page displays the service info and phone number clearly
- [ ] All pages load correctly on both desktop and mobile

---

## 11. Open Questions

- Who operates the professional hunter service and handles refund disputes?
- What happens if a finder submits a stolen photo to fake a claim?
- Does the site need user reporting / flagging for suspicious listings?
