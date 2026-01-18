import type { Meeting } from "../../src/endpoints.types"

describe("Unscheduled Meetings", () => {
  it("returns meetings without schedule (nextEventUTC) information when querying for unscheduled meetings", () => {
    const reqQuery = {
      scheduled: false,
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body
      expect(meetings.length).to.be.greaterThan(0)

      const meetingsWithNextEvent = meetings.filter(
        (meeting: { nextEventUTC?: string }) =>
          meeting.nextEventUTC !== null && meeting.nextEventUTC !== undefined,
      )
      expect(meetingsWithNextEvent.length).to.equal(0)
    })
  })

  it("ignores temporal parameters (start, hours) when scheduled=false", () => {
    // First, get unscheduled meetings without temporal params as baseline
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: { scheduled: false },
      failOnStatusCode: false,
    }).then((baselineResponse) => {
      expect(baselineResponse.status).to.equal(200)
      const baselineMeetings = baselineResponse.body
      const baselineCount = baselineMeetings.length

      // Now send the same request with temporal params that should be ignored
      const reqQuery = {
        scheduled: false,
        start: "2026-01-16T10:00:00Z",
        hours: 2,
      }

      cy.request({
        method: "GET",
        url: "/meetings",
        qs: reqQuery,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        const meetings = response.body

        // Should return same count as baseline (temporal params ignored)
        expect(meetings.length).to.equal(baselineCount)

        // All meetings should still have null nextEventUTC
        const meetingsWithNextEvent = meetings.filter(
          (meeting: { nextEventUTC?: string }) =>
            meeting.nextEventUTC !== null && meeting.nextEventUTC !== undefined,
        )
        expect(meetingsWithNextEvent.length).to.equal(0)

        // Verify we got the same set of meetings
        const baselineSlugs = baselineMeetings
          .map((m: { slug: string }) => m.slug)
          .sort()
        const responseSlugs = meetings
          .map((m: { slug: string }) => m.slug)
          .sort()
        expect(responseSlugs).to.deep.equal(baselineSlugs)
      })
    })
  })

  it("allows filtering unscheduled meetings by format", () => {
    const reqQuery = {
      scheduled: false,
      formats: "D",
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body

      if (meetings.length > 0) {
        console.log(`Found ${meetings.length} unscheduled discussion meetings`)

        expect(
          meetings.every((meeting: { formats: string[] }) =>
            meeting.formats.includes("D"),
          ),
        ).to.be.true

        const meetingsWithNextEvent = meetings.filter(
          (meeting: { nextEventUTC?: string }) =>
            meeting.nextEventUTC !== null && meeting.nextEventUTC !== undefined,
        )
        expect(meetingsWithNextEvent.length).to.equal(0)
      }
    })
  })

  it("allows filtering unscheduled meetings by type", () => {
    const reqQuery = {
      scheduled: false,
      type: "O",
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body

      if (meetings.length > 0) {
        console.log(`Found ${meetings.length} unscheduled open meetings`)

        expect(
          meetings.every((meeting: { type: string }) => meeting.type === "O"),
        ).to.be.true
      }
    })
  })

  it("allows combining unscheduled filter with name search", () => {
    const reqQuery = {
      scheduled: false,
      nameQuery: "online",
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body

      if (meetings.length > 0) {
        console.log(
          `Found ${meetings.length} unscheduled meetings matching "online"`,
        )

        meetings.forEach((meeting: { name: string }) => {
          expect(meeting.name.toLowerCase()).to.include("online")
        })
      }
    })
  })

  it("allows combining multiple filters with scheduled=false", () => {
    const reqQuery = {
      scheduled: false,
      type: "O",
      formats: "D",
      languages: "en",
      nameQuery: "group",
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body

      if (meetings.length > 0) {
        console.log(
          `Found ${meetings.length} unscheduled meetings with combined filters`,
        )

        meetings.forEach(
          (meeting: {
            type: string
            formats: string[]
            languages: string[]
            name: string
            nextEventUTC?: string | null
          }) => {
            expect(meeting.type).to.equal("O")
            expect(meeting.formats).to.include("D")
            expect(meeting.languages).to.include("en")
            expect(meeting.name.toLowerCase()).to.include("group")
            expect(meeting.nextEventUTC).to.be.oneOf([null, undefined])
          },
        )
      } else {
        // If no results, log that - this is valid but we want visibility
        console.log(
          "No meetings found matching all combined filters - this may be expected",
        )
      }
    })
  })

  it("returns complete and correct response structure for unscheduled meetings", () => {
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: { scheduled: false },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings: Meeting[] = response.body

      expect(meetings.length).to.be.greaterThan(0)

      meetings.forEach((meeting) => {
        console.log(meeting)
        expect(meeting).to.have.property("slug").that.is.a("string")
        expect(meeting).to.have.property("name").that.is.a("string")
        expect(meeting).to.have.property("groupID").that.is.a("string")
        expect(meeting).to.have.property("formats").that.is.an("array")
        expect(meeting).to.have.property("features").that.is.an("array")
        expect(meeting).to.have.property("communities").that.is.an("array")
        expect(meeting).to.have.property("languages").that.is.an("array")

        if (meeting.type !== undefined) {
          expect(meeting.type).to.be.a("string")
        }
        if (meeting.timezone !== undefined && meeting.timezone !== null) {
          expect(meeting.timezone).to.be.a("string")
        }

        expect(meeting.timeUTC).to.be.oneOf([null, undefined])

        expect(meeting).to.not.have.property("_id")
      })
    })
  })
})
