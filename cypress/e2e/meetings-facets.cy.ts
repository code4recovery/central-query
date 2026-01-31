describe("Meetings Facets API", () => {
  it("returns scheduled and unscheduled facets with categories and languages", () => {
    cy.request({
      method: "GET",
      url: "/meetings/facets",
      failOnStatusCode: false,
    }).then((response) => {
      console.log("Response body:", response.body)
      expect(response.status).to.equal(200)
      expect(response.body).to.be.an("object")
      expect(response.body).to.not.be.empty

      // Verify the structure contains scheduled and unscheduled facets
      expect(response.body).to.have.property("scheduled")
      expect(response.body).to.have.property("unscheduled")

      const scheduled = response.body.scheduled
      const unscheduled = response.body.unscheduled

      // Verify the structure contains categories and languages
      expect(scheduled).to.have.property("categories")
      expect(scheduled).to.have.property("languages")
      expect(unscheduled).to.have.property("categories")
      expect(unscheduled).to.have.property("languages")

      // Verify scheduled categories and languages are arrays
      expect(scheduled.categories).to.be.an("object")
      expect(scheduled.categories).to.have.all.keys(
        "communities",
        "features",
        "formats",
        "type",
      )
      expect(scheduled.languages).to.be.an("array")
      expect(scheduled.languages.length).to.be.greaterThan(0)

      // Verify unscheduled categories and languages are arrays
      expect(unscheduled.categories).to.be.an("object")
      expect(unscheduled.categories).to.have.all.keys(
        "communities",
        "features",
        "formats",
        "type",
      )
      expect(unscheduled.languages).to.be.an("array")
      expect(unscheduled.languages.length).to.be.greaterThan(0)
    })
  })

  it("handles missing endpoint gracefully", () => {
    cy.request({
      method: "GET",
      url: "/meetings/facets/nonexistent",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(404)
    })
  })
})
