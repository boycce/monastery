let util = require('../lib/util')

module.exports = function(monastery, db) {

  test('Utilities', async () => {
    expect(await util.parseFormData({
      'name': 'Martin',
      'deep[companyLogo]': 'a',
      'deep[companyLogos][0]': 'b',
      'deep[companyLogos2][0][logo]':'c',
      'deep[companyLogos2][1][logo]': ''
    })).toEqual({
      name: 'Martin',
      deep: {
        companyLogo: 'a',
        companyLogos: ['b'],
        companyLogos2: [{ logo: 'c' }, { logo: '' }]
      }
    })
  })

}
