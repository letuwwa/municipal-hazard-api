import { useState, useEffect } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'

function App() {
  const [hazards, setHazards] = useState([])
  const [error, setError] = useState(null)

  // 1. הגדרת מזהה מפה ייחודי (חובה עבור AdvancedMarker של גוגל)
  // אתה יכול להשאיר את ה-DEMO_MAP_ID או לייצר אחד ב-Google Console
  const MAP_ID = 'DEMO_MAP_ID' 

  const fetchHazards = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/hazards/', {
        method: "GET",
        headers: {
          // תדביק פה את הטוקן הזמני שלך שעבד מקודם
          "Authorization": `Bearer $(import.meta.env.TOKEN)`  
        }
      })
      
      if (!response.ok) {
        throw new Error('שגיאה בקבלת הנתונים מהשרת')
      }
      
      const data = await response.json()
      setHazards(data)
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  useEffect(() => {
    fetchHazards()
  }, [])

  return (
    <div style={{ padding: '20px', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <h1>מפת מפגעים עירונית בלייב</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>הצגת נתונים מפורט 8000 על גבי גוגל מאפס</p>

      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>שגיאה: {error}</p>}

      {/* 2. עטיפת האזור ברכיב ה-Provider של גוגל עם המפתח שלך */}
      <APIProvider apiKey={import.meta.env.MAP_API}>
        <div style={{ width: '100%', height: '500px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          
          <Map
            defaultCenter={{ lat: 32.0853, lng: 34.7818 }} // נקודת מוצא (תל אביב)
            defaultZoom={11}
            mapId={MAP_ID}
            gestureHandling={'greedy'}
          >
            
            {/* 3. לולאה שרצה על כל המפגעים ומייצרת סיכות על המפה */}
            {hazards.map((hazard) => {
              // ודא ששמות השדות כאן (lat, lng) תואמים בדיוק למה שחוזר ב-JSON מהבקאנד שלך!
              const latitude = parseFloat(hazard.latitude || hazard.lat)
              const longitude = parseFloat(hazard.longitude || hazard.lng)

              // בדיקת בטיחות: ודא שהנ"צ תקין לפני שמציגים את הסיכה
              if (isNaN(latitude) || isNaN(longitude)) return null;

              return (
                <AdvancedMarker
                  key={hazard.id || hazard._id}
                  position={{ lat: latitude, lng: longitude }}
                  title={hazard.title || 'דיווח על מפגע'}
                >
                  {/* עיצוב הסיכה עצמה */}
                  <Pin background={'#ef4444'} borderColor={'#b91c1c'} glyphColor={'#ffffff'} />
                </AdvancedMarker>
              )
            })}

          </Map>
          
        </div>
      </APIProvider>

      {/* הצגת ה-JSON המקורי למטה לגיבוי ובקרה */}
      <details style={{ marginTop: '20px' }}>
        <summary style={{ cursor: 'pointer', color: '#2563eb', fontWeight: '600' }}>הצג נתוני קלט גולמיים (JSON)</summary>
        <pre style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '8px', marginTop: '10px', fontSize: '12px' }}>
          {JSON.stringify(hazards, null, 2)}
        </pre>
      </details>
    </div>
  )
}

export default App