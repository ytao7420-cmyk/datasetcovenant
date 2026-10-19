"""Deterministic invariants using explicit mocked GenLayer HTTP/model/consensus. Not live evidence."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest
ROOT = Path(__file__).resolve().parents[1]
OWNER, ANALYST, OTHER = ['0x' + digit * 40 for digit in '123']
class UserError(Exception): pass
class Disagreement(Exception): pass
class TreeMap(dict): pass
class Return:
    def __init__(self, calldata): self.calldata = calldata
class Contract:
    def __new__(cls):
        obj = object.__new__(cls)
        for name, ann in cls.__annotations__.items(): setattr(obj, name, TreeMap())
        return obj
class Runtime:
    def __init__(self):
        self.answers=[];self.bodies={};self.status=200
        self.gl=types.SimpleNamespace(Contract=Contract, public=types.SimpleNamespace(write=lambda f:f,view=lambda f:f),
          message=types.SimpleNamespace(sender_address=types.SimpleNamespace(as_hex=OWNER)),
          nondet=types.SimpleNamespace(web=types.SimpleNamespace(get=self.fetch),exec_prompt=self.prompt),
          eq_principle=types.SimpleNamespace(strict_eq=lambda f:f()),vm=types.SimpleNamespace(UserError=UserError,Return=Return,run_nondet_unsafe=self.run))
    def fetch(self,url,headers): return types.SimpleNamespace(status=self.status,body=self.bodies[url])
    def prompt(self,prompt,response_format): return copy.deepcopy(self.answers.pop(0))
    def run(self,leader,validator):
        result=leader()
        if not validator(Return(result)): raise Disagreement('Independent validator disagreed')
        return result
R=Runtime();stub=types.ModuleType('genlayer');stub.gl=R.gl;stub.TreeMap=TreeMap;sys.modules['genlayer']=stub
spec=importlib.util.spec_from_file_location('dc',ROOT/'contracts/datasetcovenant.py');dc=importlib.util.module_from_spec(spec);spec.loader.exec_module(dc)
META=(ROOT/'public/evidence/worldbank-metadata.json').read_text();SERIES=(ROOT/'public/evidence/worldbank-series.json').read_text();PRESETS=json.loads((ROOT/'public/presets.json').read_text())
def extraction(status='SUPPORTED'):
    return {d:{'status':status,'reason':'The stated definition supports this bounded intention.','citations':[3,4,5]} for d in ('population','measurement','exclusions')}
class Tests(unittest.TestCase):
    def setUp(self):
        R.gl.message.sender_address.as_hex=OWNER;R.answers=[];R.status=200;R.bodies={dc.META_URL:META.encode(),dc.SERIES_URL:SERIES.encode()};self.c=dc.DatasetCovenant()
    def create(self,id='base',intent=None,parent='',digest=''):
        self.c.create_covenant(id,ANALYST,json.dumps(intent or PRESETS[0]['intent']),dc._hash(META),dc._hash(SERIES),parent,digest)
    def load(self,id='base'): return json.loads(self.c.get_covenant(OWNER,id))
    def capture(self,id='base'): R.gl.message.sender_address.as_hex=ANALYST;self.c.capture_sources(OWNER,id)
    def assess(self,id='base',first=None,second=None,audit=None):
        first=first or extraction();R.answers=[first,second or first,audit or {d:True for d in ('population','measurement','exclusions')}];self.c.assess(OWNER,id)
    def ready(self): self.create();self.capture();self.assess();R.gl.message.sender_address.as_hex=OWNER
    def test_separate_parties_required(self):
        with self.assertRaises(UserError):self.c.create_covenant('base',OWNER,json.dumps(PRESETS[0]['intent']),dc._hash(META),dc._hash(SERIES),'','')
    def test_commitment_immutable(self):
        self.create()
        with self.assertRaises(UserError):self.create()
    def test_analyst_only_capture(self):
        self.create()
        with self.assertRaises(UserError):self.c.capture_sources(OWNER,'base')
    def test_source_hash_change_rejected(self):
        self.create();R.bodies[dc.META_URL]=META.encode()+b' '
        with self.assertRaises(UserError):self.capture()
        self.assertIsNone(self.load()['source'])
    def test_capture_immutable(self):
        self.create();self.capture()
        with self.assertRaises(UserError):self.capture()
    def test_wrong_indicator_rejected(self):
        m=json.loads(META);m[1][0]['id']='wrong'
        with self.assertRaises(UserError):dc._source(json.dumps(m),SERIES)
    def test_wrong_country_rejected(self):
        s=json.loads(SERIES);s[1][0]['countryiso3code']='CHN'
        with self.assertRaises(UserError):dc._source(META,json.dumps(s))
    def test_duplicate_year_rejected(self):
        s=json.loads(SERIES);s[1][1]['date']=s[1][0]['date']
        with self.assertRaises(UserError):dc._source(META,json.dumps(s))
    def test_missing_is_not_zero(self):
        s=json.loads(SERIES);s[1][0]['value']=0;s[1][1]['value']=None
        result=dc._source(META,json.dumps(s));byyear={r['year']:r['available'] for r in result['records']}
        self.assertTrue(byyear[int(s[1][0]['date'])]);self.assertFalse(byyear[int(s[1][1]['date'])])
        result=dc._final(PRESETS[0]['intent'],result,extraction());self.assertEqual(result['dimensions']['period']['status'],'UNKNOWN')
    def test_incomplete_page_rejected(self):
        s=json.loads(SERIES);s[0]['pages']=2
        with self.assertRaises(UserError):dc._source(META,json.dumps(s))
    def test_geography_deterministic_contradiction(self):
        i=copy.deepcopy(PRESETS[0]['intent']);i['geography']='GLOBAL'
        a=dc._final(i,dc._source(META,SERIES),extraction());self.assertEqual(a['verdict'],'CONTRADICTED')
    def test_causal_design_unknown(self):
        a=dc._final(PRESETS[2]['intent'],dc._source(META,SERIES),extraction());self.assertEqual(a['verdict'],'UNKNOWN')
    def test_citation_bounds(self):
        result=extraction();result['population']['citations']=[999]
        with self.assertRaises(UserError):dc._decision(result,dc._source(META,SERIES))
    def test_independent_disagreement_blocks(self):
        self.create();self.capture();other=extraction('UNKNOWN')
        with self.assertRaises(Disagreement):self.assess(second=other)
        self.assertIsNone(self.load()['assessment'])
    def test_substantive_citation_audit_blocks(self):
        self.create();self.capture()
        with self.assertRaises(Disagreement):self.assess(audit={'population':False,'measurement':True,'exclusions':True})
        self.assertIsNone(self.load()['assessment'])
    def test_acknowledge_exact_digest(self):
        self.ready();c=self.load();self.c.acknowledge('base',c['assessment']['digest']);ack=self.load()['acknowledgement'];self.assertEqual(ack['assessment_digest'],c['assessment']['digest']);self.assertEqual(ack['researcher'],OWNER)
    def test_wrong_digest_no_receipt(self):
        self.ready()
        with self.assertRaises(UserError):self.c.acknowledge('base','f'*64)
        self.assertIsNone(self.load()['acknowledgement'])
    def test_analyst_cannot_ack_researcher_record(self):
        self.ready();R.gl.message.sender_address.as_hex=ANALYST
        with self.assertRaises(UserError):self.c.acknowledge('base',self.load()['assessment']['digest'])
    def test_new_revision_does_not_inherit_approval(self):
        self.ready();old=self.load();self.c.acknowledge('base',old['assessment']['digest'])
        self.create('revision',PRESETS[2]['intent'],'base',old['intent_digest']);self.capture('revision');self.assess('revision');R.gl.message.sender_address.as_hex=OWNER
        new=self.load('revision');self.assertIsNone(new['acknowledgement']);self.assertEqual(new['assessment']['verdict'],'UNKNOWN')
        with self.assertRaises(UserError):self.c.acknowledge('revision',old['assessment']['digest'])
    def test_parent_digest_must_match(self):
        self.create()
        with self.assertRaises(UserError):self.create('revision',parent='base',digest='f'*64)
    def test_boolean_not_year(self):
        i=copy.deepcopy(PRESETS[0]['intent']);i['period']['from']=True
        with self.assertRaises(UserError):dc._intent(i)
    def test_contradiction_ack_does_not_override(self):
        self.create();self.capture();self.assess(first=extraction('CONTRADICTED'));R.gl.message.sender_address.as_hex=OWNER;c=self.load();self.c.acknowledge('base',c['assessment']['digest']);self.assertEqual(self.load()['assessment']['verdict'],'CONTRADICTED')
if __name__=='__main__':unittest.main()
