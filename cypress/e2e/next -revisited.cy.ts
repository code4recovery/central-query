describe("Next Revisited", () => {
  it("provides meetings over the next hour with a minimum of 10 meetings", () => {
    cy.request({
      method: "GET",
      url: "/meetings/next",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.equal(200)
      expect(response.body).to.have.length.greaterThan(10)
      expect(response.body).to.have.length.lessThan(101)
      console.log(response.body)
    })
  })
})
