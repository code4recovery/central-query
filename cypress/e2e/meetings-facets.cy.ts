describe("Meetings Facets API", () => {
  it("returns facets with categories and languages", () => {
    cy.request({
      method: "GET",
      url: "/meetings/facets",
      failOnStatusCode: false,
    }).then((response) => {
      console.log("Response body:", response.body)
      expect(response.status).to.equal(200)
      expect(response.body).to.be.an("object")
      expect(response.body).to.not.be.empty

      // Verify the structure contains categories and languages
      expect(response.body).to.have.property("categories")
      expect(response.body).to.have.property("languages")

      // Verify categories and languages are arrays
      expect(response.body.categories).to.be.an("object")
      expect(response.body.categories).to.have.all.keys(
        "communities",
        "features",
        "formats",
        "type",
      )
      expect(response.body.languages).to.be.an("array")

      expect(response.body.languages.length).to.be.greaterThan(0)
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
