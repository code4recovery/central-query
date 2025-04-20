/** These test are designed to provide data for comparison with OIAA website.
 * Ensure the faked time of the MongoDB server is off. */
describe("Basic queries", () => {
  it("provides the next x=limit meetings. Use to manually compare to OIAA website listing.", () => {
    const reqQuery = {
      limit: 25,
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      expect(response.body).to.have.length(25)
    })
  })
  it.skip("returns the next X < 25 closed discussion meetings as a given time.", () => {
    const testFormats = ["D"]
    const testType = "C"
    const reqQuery = {
      types: JSON.stringify(testTypes),
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      const meetings = response.body
      expect(
        meetings
          .map((meeting: { type: string; formats: string[] }) =>
            testTypes.every((element) => meeting.type.includes(element)),
          )
          .every((el: boolean) => el === true),
      ).to.be.true
    })
  })
  it("gracefully handles the shift from Sunday (day 7) to Monday (day 1)", () => {
    const reqQuery = {
      start: new Date("2023-09-10T23:45:00Z").toISOString(),
      limit: 25,
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      expect(response.body).to.have.length(25)
    })
  })
  it("reflects types binned into desired categories", () => {
    const reqQuery = {
      limit: 25,
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      response.body.forEach((mtg) => {
        cy.wrap(mtg).should("not.have.property", "types")
      })
    })
  })
  it.skip("provides the next 10 meetings at 0500 PDT that match the expected array.", () => {
    const expectedMeetings = [
      "`As Bill Sees It` Cavan Lunchtime Meeting",
      "1st Things 1st",
      "757 Breakfast Club Online",
      "AA Acceptance and Gratitude",
      "AA Breakfast Club",
      "AA Women Listening to God",
      "AA-Alive",
      "Agnes Water",
      "Castleknock Dublin",
      "Daily reflections",
    ]
    const now = new Date("2023-09-10T05:00:00-07:00")
    const reqQuery = {
      time: now.toISOString(),
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      expect(response.body).to.have.length(10)
      expect(response.body).to.equal(expectedMeetings)
    })
  })
  it.skip("handles more generic queries", () => {
    const reqQuery = {
      weekday: "TUESDAY",
      timezone: "America/New_York",
    }
    cy.request({
      method: "GET",
      url: "/meetings",
      qs: reqQuery,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
    })
  })
})
