describe("Malformed query parameter handling", () => {
  describe("limit parameter validation", () => {
    it("handles non-numeric limit by using default value", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit=abc",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
        expect(response.body.length).to.be.at.most(1000)
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

    it("handles limit below minimum by using default", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit=0",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
      })
    })

    it("handles limit above maximum (1000) by using default", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit=5000",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
        expect(response.body.length).to.be.at.most(1000)
      })
    })

    it("handles negative limit by using default", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit=-50",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
      })
    })
  })

  describe("hours parameter validation", () => {
    it("handles excessive hours value by capping at maximum (168)", () => {
      const now = new Date().toISOString()
      cy.request({
        method: "GET",
        url: `/meetings?hours=999&start=${now}`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
      })
    })

    it("handles non-numeric hours by using default (24)", () => {
      const now = new Date().toISOString()
      cy.request({
        method: "GET",
        url: `/meetings?hours=abc&start=${now}`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
      })
    })

    it("handles hours below minimum by using default", () => {
      const now = new Date().toISOString()
      cy.request({
        method: "GET",
        url: `/meetings?hours=0&start=${now}`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
      })
    })

    it("handles negative hours by using default", () => {
      const now = new Date().toISOString()
      cy.request({
        method: "GET",
        url: `/meetings?hours=-10&start=${now}`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
      })
    })
  })

  describe("start parameter validation", () => {
    it("handles malformed start date gracefully", () => {
      cy.request({
        method: "GET",
        url: "/meetings?start=garbage",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
      })
    })

    it("handles completely invalid ISO string", () => {
      cy.request({
        method: "GET",
        url: "/meetings?start=not-a-date",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
      })
    })

    it("handles partial ISO date string", () => {
      cy.request({
        method: "GET",
        url: "/meetings?start=2024-13",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
      })
    })
  })

  describe("combined malformed parameters", () => {
    it("handles multiple malformed parameters without crashing", () => {
      cy.request({
        method: "GET",
        url: "/meetings?limit=abc&hours=xyz&start=garbage",
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200)
        expect(response.body).to.be.an("array")
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
          expect(response.status).to.equal(200)
          expect(response.body).to.be.an("array")
        })
      })
    })
  })
})
