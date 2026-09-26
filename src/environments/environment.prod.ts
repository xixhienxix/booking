export const environment = {
  production:   true,
  appVersion:   'v726demo1',
  USERDATA_KEY: 'authf649fc9a5f55',
  isMockEnabled: false,
  cdnUrl: 'https://d1j28y4pk9g75a.cloudfront.net',
  version: '4.0.0',
  hotelSecrets: {
    'movnext':               'movnext',
    'hotel-palomas':         'hotel-palomas',
    'hotel-palomas-express': 'hotel-palomas-express',
    'hotel-palomas-nayarit': 'hotel-palomas-nayarit',
  } as Record<string, string>,
    internalSecret: 'y3RB@5gX#Q6mv4eVZ2Lcz8!upG*M7daFqK$P1sRjHT9NnDbGx^Yf%WAoeLiXU0Ct'
};
//https://d3lkfchxk2jil4.cloudfront.net?hotel=movnext
//https://d3lkfchxk2jil4.cloudfront.net?hotel=hotel-palomas
//https://d3lkfchxk2jil4.cloudfront.net?hotel=hotel-palomas-express
//https://d3lkfchxk2jil4.cloudfront.net?hotel=hotel-palomas-nayarit