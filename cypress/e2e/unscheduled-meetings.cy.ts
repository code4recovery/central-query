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
})
