from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI,HTTPException,Query
from pydantic import BaseModel
from dotenv import load_dotenv
import requests
import time
import json
import api
import os


load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ['*'],
    allow_methods = ['*'],
    allow_headers = ['*']
)

class location(BaseModel):
    name: str

"""So cache class help with rate limit of the apis it store apis responces and use it till the valid 
time like if i search for a place then someone else also give same input in 20 sec then cache give
exact output to that person also """

class cache:
    def __init__(self,ttl):
        self.cache_TTL = ttl #this is the validation time 
        self.cache = {} #this is the cache dict

    def cache_ttl(self,key): #it check if cache have the data and is it valid
        item = self.cache.get(key) #it get the specific key data
        if item is None:
            return None
        
        data,selected_time = item
        if time.time() - selected_time < self.cache_TTL:#here we are checking if data is valid if not then
            return data                                 #delete data

        del self.cache[key]# it delete invalid data there time excid the cache time limit

    def set_cache(self,keys,data):#it set value in the cache dict by geting key and data
        self.cache[keys] = data,time.time()
        # return data
            

class contry_state:
    def __init__(self):
        self.geo = cache(3600)# so for geo we are using big time lmit because country city cordinates never
                                #changes 
        self.sat = cache(40)# And for neo we are using small time lmit because sateelite cordinates changes 
                            #everytime
    def geo_data(self,name):
        
        key = name.strip().lower()
        if not key:
            raise HTTPException(status_code=400,detail='Enter name')
        
        cache = self.geo.cache_ttl(key)#we are getting key data from cache
        if cache is not None:#if cache have data then it will return if not then next line will run
            return cache

        v = f'https://geocode.maps.co/search'
        api = os.getenv('api1')
        try:
            gro_responce = requests.get(
                v,
                params={'q':key,
                        'api_key':api},
                timeout= 15
            )
            gro_responce.raise_for_status()#it will tell if the responce is invalid due to api 
                                                 #rate limit
            gro_responce_json = gro_responce.json()
        except:
            raise HTTPException(status_code=502,detail='Invalid responce')

        if not gro_responce_json:
            raise HTTPException(status_code=404,detail='Place not found')
        
        data = (gro_responce_json[0]['lat'],gro_responce_json[0]['lon'])
        self.geo.set_cache(key,data)#here we are setting the key and there data to cache
        return data
    
    def sateelite_data(self,data):

        key = (data[0],data[1])#because geo_data is lat and lon thats why data has 2 values
        
        cache_data = self.sat.cache_ttl(key)#we are getting key data from cache
        if cache_data is not None:#if cache have data then it will return if not then next line will run
            return cache_data
        
        try:
            api2 = os.getenv('api2')
            satellite_responce = requests.get(
                f'https://api.n2yo.com/rest/v1/satellite/above/{data[0]}/{data[1]}/0/30/0/',
                params={'apiKey':api2},
                timeout= 15
            )
            satellite_responce.raise_for_status()#it will tell if the responce is invalid due to api 
                                                 #rate limit
            api_response = satellite_responce.json()
        except:
            raise HTTPException(status_code=502,detail='Invalid responce')

        result = []
        for j in api_response['above']:
            result.append({
                "Satname": j["satname"],
                "Latitude": j["satlat"],
                "Longitude": j["satlng"],
                "Launch_date":j['launchDate']
            })

        self.sat.set_cache(key,result)#here we are setting the key and there data to cache
        return result
    
    def mainn(self,name):# this is where both function data is being shared
        lat,lon = self.geo_data(name)
        data = (lat,lon)
        return self.sateelite_data(data)


active = contry_state()
 
@app.get('/Data')
def dataa(name:str=Query(...,min_length=1)):
    return active.mainn(name)