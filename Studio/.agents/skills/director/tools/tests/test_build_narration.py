import hashlib
import importlib.util
import json
import tempfile
import unittest
import wave
from pathlib import Path

spec=importlib.util.spec_from_file_location('build_narration',str(Path(__file__).resolve().parents[1] / 'build_narration.py'))
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class Voice:
    def __init__(self, fail_at=None):
        self.calls=0
        self.fail_at=fail_at
    def synthesize(self,text):
        self.calls+=1
        if self.calls==self.fail_at: raise RuntimeError('simulated generation failure')
        return b'\x00\x10' * (mod.SAMPLE_RATE//2 + len(text)*10)

class NarrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.out=Path(self.tmp.name)/'generated'
        self.raw={'version':1,'voice':'af_heart','speed':1.02,'sample':{'text':'This is an approved local sample','seconds':2.5},'target_seconds':{'min':1,'max':30},'scenes':[
            {'id':'scene-01','chapter':'Opening','lines':[{'text':'A useful first line.','pause_after':0.2},{'text':'A second line.'}]},
            {'id':'scene-02','chapter':'Close','lines':[{'text':'A final line.','pause_after':0.1}], 'end_pause':0.5}]}
    def test_preflight_rejects_before_writes(self):
        raw=json.loads(json.dumps(self.raw));raw['scenes'][1]['id']='scene-01'
        with self.assertRaises(ValueError):mod.validate(raw)
        self.assertFalse(self.out.exists())
        raw=json.loads(json.dumps(self.raw));raw['scenes'][1]['lines'][0]['pause_after']=-1
        with self.assertRaises(ValueError):mod.validate(raw)
    def test_twice_same_outputs_no_duplicate_cues(self):
        manifest=mod.validate(self.raw)
        one=mod.produce(manifest,self.out,Voice())
        first={p.relative_to(self.out):hashlib.sha256(p.read_bytes()).digest() for p in self.out.rglob('*') if p.is_file()}
        two=mod.produce(manifest,self.out,Voice())
        second={p.relative_to(self.out):hashlib.sha256(p.read_bytes()).digest() for p in self.out.rglob('*') if p.is_file()}
        self.assertEqual(first,second)
        self.assertEqual(one,two)
        cues=json.loads((self.out/'caption-cues.json').read_text())
        self.assertEqual(len(cues),3)
        self.assertEqual(len(set(c['id'] for c in cues)),3)
        self.assertTrue(all(a['end']<b['start'] for a,b in zip(cues,cues[1:])))
        self.assertEqual([c['text'] for c in cues],['A useful first line.','A second line.','A final line.'])
        self.assertEqual((self.out/'captions.srt').read_text().count(' --> '),3)
        self.assertIn('A final line.',(self.out/'transcript.txt').read_text())
        with wave.open(str(self.out/'voice/narration.wav'),'rb') as wav:
            self.assertAlmostEqual(wav.getnframes()/wav.getframerate(),one['duration'],places=5)
    def test_interrupted_build_preserves_complete_previous_set(self):
        manifest=mod.validate(self.raw)
        mod.produce(manifest,self.out,Voice())
        old={p.relative_to(self.out):hashlib.sha256(p.read_bytes()).digest() for p in self.out.rglob('*') if p.is_file()}
        with self.assertRaises(RuntimeError):mod.produce(manifest,self.out,Voice(fail_at=2))
        new={p.relative_to(self.out):hashlib.sha256(p.read_bytes()).digest() for p in self.out.rglob('*') if p.is_file()}
        self.assertEqual(old,new)
        self.assertFalse(list(Path(self.tmp.name).glob('.generated-stage-*')))
    def test_restores_previous_set_after_promotion_interruption(self):
        manifest=mod.validate(self.raw)
        mod.produce(manifest,self.out,Voice())
        backup=self.out.parent/f'.{self.out.name}-previous'
        self.out.rename(backup)
        with self.assertRaises(RuntimeError):
            mod.produce(manifest,self.out,Voice(fail_at=1))
        self.assertTrue(self.out.exists())
        self.assertFalse(backup.exists())
        self.assertEqual(json.loads((self.out/'build.json').read_text())['cueCount'],3)
    def test_project_reference_and_output_ownership(self):
        manifest=mod.validate(self.raw)
        project=Path(self.tmp.name)/'project';project.mkdir()
        (project/'index.html').write_text('<div data-composition-id="frame-01"></div>')
        manifest['scenes'][0]['project_ref']='frame-01'
        manifest['scenes'][1]['project_ref']='frame-09'
        with self.assertRaisesRegex(ValueError,'unknown project_ref'):
            mod.validate_project_refs(manifest,project)
        self.out.mkdir();(self.out/'unrelated.txt').write_text('preserve me')
        with self.assertRaisesRegex(ValueError,'not a tool-owned'):
            mod.produce(manifest,self.out,Voice())
        self.assertEqual((self.out/'unrelated.txt').read_text(),'preserve me')
    def test_duration_estimate_flags_short_script(self):
        manifest=mod.validate(self.raw)
        estimate=mod.estimate_seconds(manifest)
        self.assertGreater(estimate,0)
        self.assertLess(estimate,30)

if __name__=='__main__': unittest.main()
