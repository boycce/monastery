let util = require('../lib/util')

module.exports = function(monastery, db) {

  test('Utilities: formdata', async () => {
    expect(await util.parseFormData({
      'name': 'Martin',
      'pets[]': '',
      'deep[companyLogo]': 'a',
      'deep[companyLogos][0]': 'b',
      'deep[companyLogos2][0][logo]':'c',
      'deep[companyLogos2][1][logo]': '',
      "users[0][first]": "Martin",
      "users[0][last]": "Luther",
      "users[1][first]": "Bruce",
      "users[1][last]": "Lee",
    })).toEqual({
      name: 'Martin',
      pets: expect.any(Array),
      deep: {
        companyLogo: 'a',
        companyLogos: ['b'],
        companyLogos2: [{ logo: 'c' }, { logo: '' }]
      },
      users: [
        { "first": "Martin", "last": "Luther" },
        { "first": "Bruce", "last": "Lee" },
      ]
    })
    expect(util.parseFormData({ "users[]['name']": 'Martin' })).rejects
      .toEqual(`Array items in bracket notation need array indexes "users[]['name']", e.g. users[0][name]`)
  })

}
