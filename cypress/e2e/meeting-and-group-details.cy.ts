describe("bySlug endpoint", () => {
  it("provides the correct information for a legitimate slug", () => {
    cy.request({
      method: "GET",
      url: "/meetings/global-mens-meditation-6",
      failOnStatusCode: false,
    }).then((response) => {
      console.log(response.body)
      expect(response.status).to.equal(200)
      expect(response.body).to.have.property(
        "groupEmail",
        "globalmensmeditation@gmail.com",
      )
      expect(response.body).to.have.property("features")
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
describe("relatedGroupInfo endpoint", () => {
  it("provides the remaining group information and other group meetings for a legitimate slug", () => {
    cy.request({
      method: "GET",
      url: "/meetings/global-mens-meditation-6/related-group-info",
      failOnStatusCode: false,
    }).then((response) => {
      console.log(response.body)
      expect(response.status).to.equal(200)
      expect(response.body).to.have.property("groupInfo")
      expect(response.body).to.have.property("groupMeetings")
    })
  })
  it("returns a 404 for an non-existent slug", () => {
    cy.request({
      method: "GET",
      url: "/meetings/non-existent-slug/related-group-info",
      failOnStatusCode: false,
    }).then((response) => {
      console.log(response.body)
      expect(response.status).to.equal(404)
    })
  })
})
// describe("meeting/by-group endpoint", () => {
//   it("returns a 200 for a valid groupID", () => {
//     cy.request({
//       method: "GET",
//       url: "/meetings/by-group/64d7e9f0c2b2c8b4f5a1e4d8",
//       failOnStatusCode: false,
//     }).then((response) => {
//       console.log(response.body)
//       expect(response.status).to.equal(200)
//     })
//   })
//   it("returns a 404 for an invalid groupID", () => {
//     cy.request({
//       method: "GET",
//       url: "/meetings/by-group/invalid-group-id",
//       failOnStatusCode: false,
//     }).then((response) => {
//       console.log(response.body)
//       expect(response.status).to.equal(404)
//     })
//   })
// })
