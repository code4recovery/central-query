describe("Group Details endpoint", () => {
  it("provides the correct group information for a legitimate slug", () => {
    cy.request({
      method: "GET",
      url: "/meetings/global-mens-meditation-6",
      failOnStatusCode: false,
    }).then((response) => {
      console.log(response.body)
      expect(response.status).to.equal(200)
      expect(response.body).to.have.property(
        "email",
        "globalmensmeditation@gmail.com",
      )
    })
  })
  it("returns a 404 for an non-existent slug", () => {
    cy.request({
      method: "GET",
      url: "/meetings/non-existent-slug",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(404)
    })
  })
})
