describe("Malformed query parameter handling", () => {
  const expectProblemDocument = (response: Cypress.Response<unknown>) => {
    expect(response.status).to.equal(400)
    expect(response.body).to.have.property("status", 400)
    expect(response.body).to.have.property(
      "title",
      "Malformed or missing request parameters",
    )
    expect(response.body).to.have.property("detail").that.is.a("string")
    expect(response.body).to.have.property(
      "type",
      "/errors/req-param-format-error",
    )
  }

  describe("limit parameter validation", () => {
    it("returns 400 for non-numeric limit", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit=abc",
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })

    it("handles duplicate limit parameters by using first value", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit=10&limit=20",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
        expect(response.body.length).to.be.at.most(10)
      })
    })

    it("returns 400 for limit below minimum", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit=0",
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })

    it("returns 400 for limit above maximum (1000)", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit=5000",
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })

    it("returns 400 for negative limit", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit=-50",
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })
  })

  describe("hours parameter validation", () => {
    it("returns 400 for excessive hours value", () => {
      const now = new Date().toISOString()
      cy.request({
        method: "GET",
        url: `/meetings?hours=999&start=${now}`,
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })

    it("returns 400 for non-numeric hours", () => {
      const now = new Date().toISOString()
      cy.request({
        method: "GET",
        url: `/meetings?hours=abc&start=${now}`,
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })

    it("returns 400 for hours below minimum", () => {
      const now = new Date().toISOString()
      cy.request({
        method: "GET",
        url: `/meetings?hours=0&start=${now}`,
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })

    it("returns 400 for negative hours", () => {
      const now = new Date().toISOString()
      cy.request({
        method: "GET",
        url: `/meetings?hours=-10&start=${now}`,
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })
  })

  describe("start parameter validation", () => {
    it("returns 400 for malformed start date", () => {
      cy.request({
        method: "GET",
        url: "/meetings?start=garbage",
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })

    it("returns 400 for invalid ISO string", () => {
      cy.request({
        method: "GET",
        url: "/meetings?start=not-a-date",
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })

    it("returns 400 for partial ISO date string", () => {
      cy.request({
        method: "GET",
        url: "/meetings?start=2024-13",
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })
  })

  describe("combined malformed parameters", () => {
    it("returns 400 for multiple malformed parameters", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit=abc&hours=xyz&start=garbage",
        failOnStatusCode: false,
      }).then((response) => {
        expectProblemDocument(response)
      })
    })

    it("handles array injection attempts in limit", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit[]=10&limit[]=20",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
      })
    })
  })

  describe("process stability", () => {
    it("survives repeated malformed requests without crashing", () => {
      const malformedUrls = [
        "/meetings?limit=abc",
        "/meetings?limit=10&limit=20",
        "/meetings?hours=999",
        "/meetings?start=garbage",
        "/meetings?limit=NaN",
        "/meetings?hours=Infinity",
      ]

      malformedUrls.forEach((url) => {
        cy.request({
          method: "GET",
          url,
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 400])
        })
      })
    })
  })
})
